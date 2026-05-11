const Card = ({children,classNames}:{children:React.ReactNode,classNames?:string}) => {
    return(
        <div className={`rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_24px_70px_rgba(38,55,77,0.12)] backdrop-blur-xl ${classNames || ''}`}>
            {children}
        </div>
    )
}

export default Card 
